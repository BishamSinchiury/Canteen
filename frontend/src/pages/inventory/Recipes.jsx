import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/Layout'
import { Button, Table, Badge, Loader, useToast, Modal } from '../../components/ui'
import Input, { Select } from '../../components/ui/Input'
import { fetchFoodItems, fetchRecipes, fetchIngredients, setRecipeIngredients, createRecipe } from '../../api'
import styles from '../common.module.css'

export default function Recipes() {
    const [foodItems, setFoodItems] = useState([])
    const [recipes, setRecipes] = useState([])
    const [ingredients, setIngredients] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedFoodItem, setSelectedFoodItem] = useState(null)
    const [selectedRecipe, setSelectedRecipe] = useState(null)
    const [recipeIngredients, setRecipeIngredientsList] = useState([])
    const [saving, setSaving] = useState(false)
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [foods, recs, ings] = await Promise.all([
                fetchFoodItems(),
                fetchRecipes(),
                fetchIngredients()
            ])
            setFoodItems(foods.results || foods || [])
            setRecipes(recs.results || recs || [])
            setIngredients(ings.results || ings || [])
        } catch (err) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    function openRecipeModal(food) {
        setSelectedFoodItem(food)
        const existing = recipes.find(r => r.food_item === food.id)
        setSelectedRecipe(existing)
        setRecipeIngredientsList(existing ? existing.ingredients : [])
        setShowModal(true)
    }

    function addIngredientRow() {
        setRecipeIngredientsList([...recipeIngredients, { ingredient: '', quantity: 1 }])
    }

    function removeIngredientRow(index) {
        const newList = [...recipeIngredients]
        newList.splice(index, 1)
        setRecipeIngredientsList(newList)
    }

    function updateRow(index, field, value) {
        const newList = [...recipeIngredients]
        newList[index][field] = value
        setRecipeIngredientsList(newList)
    }

    async function handleSave() {
        setSaving(true)
        try {
            let recipeId = selectedRecipe?.id
            if (!recipeId) {
                const newRecipe = await createRecipe({ food_item: selectedFoodItem.id })
                recipeId = newRecipe.id
            }

            await setRecipeIngredients(recipeId, recipeIngredients)
            toast.success('Recipe saved')
            setShowModal(false)
            loadData()
        } catch (err) {
            toast.error('Failed to save recipe')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
        { header: 'Food Item', accessor: 'name' },
        { header: 'Category', accessor: 'category' },
        {
            header: 'Recipe Status',
            render: row => {
                const recipe = recipes.find(r => r.food_item === row.id)
                return recipe ? <Badge variant="success">Defined ({recipe.ingredients.length} items)</Badge> : <Badge variant="warning">Missing</Badge>
            }
        },
        {
            header: 'Actions',
            render: (row) => (
                <Button size="sm" onClick={() => openRecipeModal(row)}>Manage Recipe</Button>
            )
        }
    ]

    if (loading) return <Loader center size="lg" />

    return (
        <div>
            <PageHeader
                title="Recipe Builder"
                subtitle="Define ingredients required for each menu item"
            />

            <Table
                columns={columns}
                data={foodItems}
                emptyMessage="No food items found"
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`Recipe For: ${selectedFoodItem?.name}`}
                width="700px"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSave} loading={saving}>Save Recipe</Button>
                    </>
                }
            >
                <div className={styles.recipeRows}>
                    {recipeIngredients.map((row, idx) => (
                        <div key={idx} className={styles.formRow} style={{ marginBottom: '10px' }}>
                            <Select
                                label="Ingredient"
                                value={row.ingredient}
                                onChange={e => updateRow(idx, 'ingredient', e.target.value)}
                                style={{ flex: 3 }}
                            >
                                <option value="">Select Ingredient</option>
                                {ingredients.map(ing => (
                                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                ))}
                            </Select>
                            <Input
                                label="Quantity"
                                type="number"
                                step="0.001"
                                value={row.quantity}
                                onChange={e => updateRow(idx, 'quantity', e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                variant="danger"
                                onClick={() => removeIngredientRow(idx)}
                                style={{ marginTop: '24px' }}
                            >
                                ×
                            </Button>
                        </div>
                    ))}
                </div>
                <Button variant="secondary" onClick={addIngredientRow} style={{ marginTop: '10px' }}>+ Add Ingredient</Button>
            </Modal>
        </div>
    )
}
